import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

export interface CDNConfig {
  provider: 'cloudflare' | 'aws' | 'azure' | 'local';
  baseUrl: string;
  apiKey?: string;
  secretKey?: string;
  region?: string;
  bucket?: string;
  localPath?: string;
  cacheControl: {
    static: string;      // 'public, max-age=31536000' (1 year)
    dynamic: string;     // 'public, max-age=300' (5 minutes)
    images: string;      // 'public, max-age=86400' (1 day)
  };
  compression: {
    enabled: boolean;
    types: string[];
  };
}

export interface CDNFile {
  originalName: string;
  cdnUrl: string;
  localPath?: string;
  size: number;
  mimeType: string;
  hash: string;
  uploadedAt: number;
  cacheControl: string;
}

export interface CDNStats {
  totalFiles: number;
  totalSize: number;
  cacheHitRate: number;
  bandwidthUsed: number;
  lastUpdated: number;
}

export class CDNService extends EventEmitter {
  private config: CDNConfig;
  private uploadedFiles: Map<string, CDNFile> = new Map();
  private stats: CDNStats = {
    totalFiles: 0,
    totalSize: 0,
    cacheHitRate: 0,
    bandwidthUsed: 0,
    lastUpdated: Date.now()
  };

  constructor(config: CDNConfig) {
    super();
    this.config = config;
    this.initializeCDN();
  }

  private initializeCDN() {
    if (this.config.provider === 'local') {
      this.ensureLocalDirectory();
    }

    console.log(`🌐 CDN service initialized with provider: ${this.config.provider}`);
  }

  private ensureLocalDirectory() {
    if (this.config.localPath) {
      const dir = path.dirname(this.config.localPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  public async uploadFile(
    filePath: string,
    options: {
      destination?: string;
      cacheControl?: string;
      compress?: boolean;
    } = {}
  ): Promise<CDNFile> {
    try {
      // Read file
      const fileBuffer = fs.readFileSync(filePath);
      const stats = fs.statSync(filePath);
      const fileName = path.basename(filePath);

      // Generate hash for versioning
      const hash = createHash('md5').update(fileBuffer).digest('hex').substring(0, 8);

      // Determine destination path
      const destination = options.destination || `${hash}/${fileName}`;
      const cdnUrl = `${this.config.baseUrl}/${destination}`;

      // Determine cache control
      const mimeType = this.getMimeType(fileName);
      const cacheControl = options.cacheControl || this.getCacheControl(mimeType);

      // Upload based on provider
      await this.uploadToProvider(fileBuffer, destination, {
        mimeType,
        cacheControl,
        compress: options.compress
      });

      // Create file record
      const cdnFile: CDNFile = {
        originalName: fileName,
        cdnUrl,
        localPath: this.config.provider === 'local' ? path.join(this.config.localPath!, destination) : undefined,
        size: stats.size,
        mimeType,
        hash,
        uploadedAt: Date.now(),
        cacheControl
      };

      // Store file record
      this.uploadedFiles.set(destination, cdnFile);

      // Update stats
      this.updateStats(cdnFile.size);

      this.emit('file-uploaded', cdnFile);

      return cdnFile;

    } catch (error) {
      console.error('CDN upload failed:', error);
      throw new Error(`Failed to upload file: ${error}`);
    }
  }

  private async uploadToProvider(
    buffer: Buffer,
    destination: string,
    options: {
      mimeType: string;
      cacheControl: string;
      compress?: boolean;
    }
  ): Promise<void> {
    switch (this.config.provider) {
      case 'local':
        await this.uploadToLocal(buffer, destination, options);
        break;
      case 'cloudflare':
        await this.uploadToCloudflare(buffer, destination, options);
        break;
      case 'aws':
        await this.uploadToAWS(buffer, destination, options);
        break;
      case 'azure':
        await this.uploadToAzure(buffer, destination, options);
        break;
      default:
        throw new Error(`Unsupported CDN provider: ${this.config.provider}`);
    }
  }

  private async uploadToLocal(
    buffer: Buffer,
    destination: string,
    options: any
  ): Promise<void> {
    if (!this.config.localPath) {
      throw new Error('Local path not configured');
    }

    const fullPath = path.join(this.config.localPath, destination);
    const dir = path.dirname(fullPath);

    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Compress if enabled and supported
    let finalBuffer = buffer;
    if (options.compress && this.shouldCompress(options.mimeType)) {
      finalBuffer = await this.compressBuffer(buffer, options.mimeType);
    }

    // Write file
    fs.writeFileSync(fullPath, finalBuffer);
  }

  private async uploadToCloudflare(
    buffer: Buffer,
    destination: string,
    options: any
  ): Promise<void> {
    // Cloudflare R2 implementation
    if (!this.config.apiKey || !this.config.secretKey) {
      throw new Error('Cloudflare credentials not configured');
    }

    // In a real implementation, you'd use the AWS SDK with Cloudflare R2 endpoint
    // For now, this is a placeholder
    console.log(`Uploading to Cloudflare R2: ${destination}`);
  }

  private async uploadToAWS(
    buffer: Buffer,
    destination: string,
    options: any
  ): Promise<void> {
    // AWS S3 implementation
    if (!this.config.apiKey || !this.config.secretKey || !this.config.bucket) {
      throw new Error('AWS credentials not configured');
    }

    // In a real implementation, you'd use the AWS SDK
    // For now, this is a placeholder
    console.log(`Uploading to AWS S3: ${destination}`);
  }

  private async uploadToAzure(
    buffer: Buffer,
    destination: string,
    options: any
  ): Promise<void> {
    // Azure Blob Storage implementation
    if (!this.config.apiKey || !this.config.bucket) {
      throw new Error('Azure credentials not configured');
    }

    // In a real implementation, you'd use the Azure SDK
    // For now, this is a placeholder
    console.log(`Uploading to Azure Blob: ${destination}`);
  }

  private getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.html': 'text/html',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.eot': 'application/vnd.ms-fontobject'
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  private getCacheControl(mimeType: string): string {
    if (mimeType.startsWith('image/')) {
      return this.config.cacheControl.images;
    }
    if (mimeType.includes('javascript') || mimeType.includes('css')) {
      return this.config.cacheControl.static;
    }
    return this.config.cacheControl.dynamic;
  }

  private shouldCompress(mimeType: string): boolean {
    if (!this.config.compression.enabled) return false;
    return this.config.compression.types.some(type => mimeType.includes(type));
  }

  private async compressBuffer(buffer: Buffer, mimeType: string): Promise<Buffer> {
    // In a real implementation, you'd use zlib for compression
    // For now, return the original buffer
    return buffer;
  }

  private updateStats(fileSize: number) {
    this.stats.totalFiles++;
    this.stats.totalSize += fileSize;
    this.stats.lastUpdated = Date.now();
  }

  public getFile(url: string): CDNFile | null {
    // Extract path from URL
    const urlPath = url.replace(this.config.baseUrl, '').replace(/^\//, '');
    return this.uploadedFiles.get(urlPath) || null;
  }

  public listFiles(): CDNFile[] {
    return Array.from(this.uploadedFiles.values());
  }

  public async deleteFile(url: string): Promise<boolean> {
    const file = this.getFile(url);
    if (!file) return false;

    try {
      await this.deleteFromProvider(url);
      this.uploadedFiles.delete(url.replace(this.config.baseUrl, '').replace(/^\//, ''));

      // Update stats
      this.stats.totalFiles--;
      this.stats.totalSize -= file.size;

      this.emit('file-deleted', file);
      return true;

    } catch (error) {
      console.error('CDN delete failed:', error);
      return false;
    }
  }

  private async deleteFromProvider(url: string): Promise<void> {
    // Implementation would depend on the provider
    // For local files, delete from filesystem
    if (this.config.provider === 'local') {
      const file = this.getFile(url);
      if (file?.localPath && fs.existsSync(file.localPath)) {
        fs.unlinkSync(file.localPath);
      }
    }
    // For cloud providers, use their APIs
  }

  public purgeCache(url?: string): Promise<boolean> {
    // Implement cache purging for CDN providers that support it
    return Promise.resolve(true);
  }

  public getStats(): CDNStats {
    return { ...this.stats };
  }

  public generatePreloadTags(): string {
    const criticalFiles = this.listFiles()
      .filter(file => file.mimeType.includes('javascript') || file.mimeType.includes('css'))
      .slice(0, 10); // Limit to 10 most recent

    return criticalFiles.map(file => {
      if (file.mimeType.includes('javascript')) {
        return `<link rel="preload" href="${file.cdnUrl}" as="script" crossorigin>`;
      } else if (file.mimeType.includes('css')) {
        return `<link rel="preload" href="${file.cdnUrl}" as="style">`;
      }
      return '';
    }).filter(Boolean).join('\n');
  }

  public optimizeForPerformance(): {
    recommendations: string[];
    actions: Array<() => Promise<void>>;
  } {
    const recommendations: string[] = [];
    const actions: Array<() => Promise<void>> = [];

    // Analyze file sizes
    const largeFiles = this.listFiles()
      .filter(file => file.size > 1024 * 1024) // > 1MB
      .sort((a, b) => b.size - a.size);

    if (largeFiles.length > 0) {
      recommendations.push(`Consider compressing ${largeFiles.length} large files (>1MB)`);
      actions.push(async () => {
        for (const file of largeFiles.slice(0, 5)) {
          // Re-upload with compression
          if (file.localPath) {
            await this.uploadFile(file.localPath, { compress: true });
          }
        }
      });
    }

    // Check cache headers
    const poorlyCached = this.listFiles()
      .filter(file => !file.cacheControl.includes('max-age'));

    if (poorlyCached.length > 0) {
      recommendations.push(`${poorlyCached.length} files have poor cache headers`);
    }

    return { recommendations, actions };
  }
}

// Default CDN configuration
export const defaultCDNConfig: CDNConfig = {
  provider: 'local',
  baseUrl: 'http://localhost:3000/static',
  localPath: './public/static',
  cacheControl: {
    static: 'public, max-age=31536000, immutable',
    dynamic: 'public, max-age=300',
    images: 'public, max-age=86400'
  },
  compression: {
    enabled: true,
    types: ['text/', 'application/json', 'application/javascript']
  }
};

// Factory function
export function createCDNService(config: Partial<CDNConfig> = {}): CDNService {
  const finalConfig = { ...defaultCDNConfig, ...config };
  return new CDNService(finalConfig);
}