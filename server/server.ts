import 'dotenv/config';
import app from './app';
import { connectDB } from './config/db';

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  try {
    await connectDB();
    
    app.listen(PORT, () => {
      console.log(`[MVC Server] Standalone API Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('[MVC Server] Database Connection Failed. Exiting...', error);
    process.exit(1);
  }
}

bootstrap();
