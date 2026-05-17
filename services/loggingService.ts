type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const formatMessage = (level: LogLevel, msg: string, meta?: any) => {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${msg}${metaStr}`;
};

export const loggingService = {
  debug: (msg: string, meta?: any) => console.debug(formatMessage('debug', msg, meta)),
  info: (msg: string, meta?: any) => console.info(formatMessage('info', msg, meta)),
  warn: (msg: string, meta?: any) => console.warn(formatMessage('warn', msg, meta)),
  error: (msg: string, meta?: any) => console.error(formatMessage('error', msg, meta)),

  // Placeholder to integrate with external logging (Logstash/Datadog)
  sendToRemote: async (payload: any) => {
    try {
      // no-op for now; implement HTTP transport or logging agent
      return true;
    } catch (err) {
      console.error('Failed to send logs to remote', err);
      return false;
    }
  }
};

export default loggingService;
