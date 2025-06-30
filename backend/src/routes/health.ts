import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { config } from '../config';

const router = Router();

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  environment: string;
  services: {
    database: ServiceHealth;
    openai: ServiceHealth;
    filesystem: ServiceHealth;
  };
  metrics: {
    uptime: number;
    memory: {
      total: number;
      used: number;
      free: number;
    };
    process: {
      pid: number;
      nodeVersion: string;
    };
  };
}

interface ServiceHealth {
  status: 'healthy' | 'unhealthy';
  responseTime?: number;
  error?: string;
  lastChecked: string;
}

let pool: Pool | null = null;

const initializePool = () => {
  if (!pool) {
    pool = new Pool({
      connectionString: config.database.url,
      ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
      max: 1,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 10000,
    });
  }
  return pool;
};

const checkDatabase = async (): Promise<ServiceHealth> => {
  const start = Date.now();
  try {
    const dbPool = initializePool();
    const result = await dbPool.query('SELECT 1');
    return {
      status: 'healthy',
      responseTime: Date.now() - start,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown database error',
      lastChecked: new Date().toISOString(),
    };
  }
};

const checkOpenAI = async (): Promise<ServiceHealth> => {
  const start = Date.now();
  try {
    if (!config.openai.apiKey || config.openai.apiKey.includes('REPLACE')) {
      return {
        status: 'unhealthy',
        error: 'OpenAI API key not configured',
        lastChecked: new Date().toISOString(),
      };
    }

    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.openai.apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      return {
        status: 'healthy',
        responseTime: Date.now() - start,
        lastChecked: new Date().toISOString(),
      };
    } else {
      return {
        status: 'unhealthy',
        error: `OpenAI API returned ${response.status}`,
        lastChecked: new Date().toISOString(),
      };
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown OpenAI error',
      lastChecked: new Date().toISOString(),
    };
  }
};

const checkFilesystem = async (): Promise<ServiceHealth> => {
  const start = Date.now();
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const uploadsDir = path.resolve(config.upload.path);
    await fs.access(uploadsDir);
    
    return {
      status: 'healthy',
      responseTime: Date.now() - start,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown filesystem error',
      lastChecked: new Date().toISOString(),
    };
  }
};

// Basic health check endpoint
router.get('/health', async (req: Request, res: Response) => {
  try {
    const [database, openai, filesystem] = await Promise.all([
      checkDatabase(),
      checkOpenAI(),
      checkFilesystem(),
    ]);

    const services = { database, openai, filesystem };
    const allHealthy = Object.values(services).every(service => service.status === 'healthy');
    const anyUnhealthy = Object.values(services).some(service => service.status === 'unhealthy');

    const memoryUsage = process.memoryUsage();
    
    const healthStatus: HealthStatus = {
      status: allHealthy ? 'healthy' : anyUnhealthy ? 'unhealthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: config.nodeEnv,
      services,
      metrics: {
        uptime: process.uptime(),
        memory: {
          total: memoryUsage.heapTotal,
          used: memoryUsage.heapUsed,
          free: memoryUsage.heapTotal - memoryUsage.heapUsed,
        },
        process: {
          pid: process.pid,
          nodeVersion: process.version,
        },
      },
    };

    const statusCode = healthStatus.status === 'healthy' ? 200 : 
                      healthStatus.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(healthStatus);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Health check failed',
    });
  }
});

// Readiness probe for Kubernetes/container orchestration
router.get('/ready', async (req: Request, res: Response) => {
  try {
    const database = await checkDatabase();
    
    if (database.status === 'healthy') {
      res.status(200).json({ 
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({ 
        status: 'not ready',
        timestamp: new Date().toISOString(),
        reason: 'Database not available',
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Readiness check failed',
    });
  }
});

// Liveness probe for Kubernetes/container orchestration
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Metrics endpoint for monitoring systems
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const metrics = {
      timestamp: new Date().toISOString(),
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      memory: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external,
        arrayBuffers: memoryUsage.arrayBuffers,
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      environment: {
        nodeEnv: config.nodeEnv,
        version: process.env.npm_package_version || '1.0.0',
      },
    };

    res.status(200).json(metrics);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Metrics collection failed',
    });
  }
});

// Prometheus-style metrics endpoint
router.get('/metrics/prometheus', (req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  const prometheusMetrics = `
# HELP nodejs_process_uptime_seconds Process uptime in seconds
# TYPE nodejs_process_uptime_seconds gauge
nodejs_process_uptime_seconds ${process.uptime()}

# HELP nodejs_memory_heap_total_bytes Total heap memory in bytes
# TYPE nodejs_memory_heap_total_bytes gauge
nodejs_memory_heap_total_bytes ${memoryUsage.heapTotal}

# HELP nodejs_memory_heap_used_bytes Used heap memory in bytes
# TYPE nodejs_memory_heap_used_bytes gauge
nodejs_memory_heap_used_bytes ${memoryUsage.heapUsed}

# HELP nodejs_memory_rss_bytes Resident Set Size in bytes
# TYPE nodejs_memory_rss_bytes gauge
nodejs_memory_rss_bytes ${memoryUsage.rss}

# HELP nodejs_cpu_user_seconds_total User CPU time in seconds
# TYPE nodejs_cpu_user_seconds_total counter
nodejs_cpu_user_seconds_total ${cpuUsage.user / 1000000}

# HELP nodejs_cpu_system_seconds_total System CPU time in seconds
# TYPE nodejs_cpu_system_seconds_total counter
nodejs_cpu_system_seconds_total ${cpuUsage.system / 1000000}
`.trim();

  res.set('Content-Type', 'text/plain');
  res.status(200).send(prometheusMetrics);
});

export default router;