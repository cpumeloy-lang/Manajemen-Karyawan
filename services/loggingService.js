const formatMessage = (level, msg, meta) => {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${msg}${metaStr}`;
};

export const loggingService = {
  debug: (msg, meta) => console.debug(formatMessage('debug', msg, meta)),
  info: (msg, meta) => console.info(formatMessage('info', msg, meta)),
  warn: (msg, meta) => console.warn(formatMessage('warn', msg, meta)),
  error: (msg, meta) => console.error(formatMessage('error', msg, meta)),
  sendToRemote: async (payload) => {
    try {
      // placeholder for remote logging integration (HTTP/agent)
      return true;
    } catch (err) {
      console.error('Failed to send logs to remote', err);
      return false;
    }
  }
};

export default loggingService;
