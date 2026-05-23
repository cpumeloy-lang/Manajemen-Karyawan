import app from './server.mjs';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

app.listen(PORT, () => {
  console.log(`HRMS Pro server running on port ${PORT} [${IS_PROD ? 'PRODUCTION' : 'DEVELOPMENT'}]`);
});
