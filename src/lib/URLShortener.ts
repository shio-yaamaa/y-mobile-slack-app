import * as uuidv5 from 'uuid/v5';
import * as AWS from 'aws-sdk';

class URLShortener {
  private s3: AWS.S3;

  constructor() {
    this.s3 = new AWS.S3({
      region: process.env.AWS_REGION
    });
  }

  private async saveRedirectObject(originalUrl: string, id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const params: AWS.S3.PutObjectRequest = {
        ACL: 'public-read',
        Bucket: process.env.URL_STORAGE_BUCKET_NAME,
        Key: id,
        Body: '',
        WebsiteRedirectLocation: originalUrl,
        ContentType: 'text/plain',
      };
  
      this.s3.putObject(params, (error, data) => {
        if (error) reject(error);
        console.log(data);
        resolve();
      });
    });
  }

  public async shorten(url: string): Promise<string> {
    const id = uuidv5(url, uuidv5.URL);
    await this.saveRedirectObject(url, id);
    return `https://s3/${id}`; // TODO
  }
}

export default new URLShortener();