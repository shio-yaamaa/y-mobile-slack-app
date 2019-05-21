import * as uuidv5 from 'uuid/v5';
import * as AWS from 'aws-sdk';

class ImageUploader {
  private s3: AWS.S3;

  constructor() {
    this.s3 = new AWS.S3({
      region: process.env.AWS_REGION
    });
  }

  private keyToUrl(key: string): string {
    return `https://s3-${process.env.AWS_REGION}.amazonaws.com/`
         + `${process.env.CHART_IMAGE_STORAGE_BUCKET_NAME}/${key}`;
  }

  // id: Anything that is unique to the image
  public async uploadImage(id: string, data: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      const key = uuidv5(id, uuidv5.URL) + '.png';
      const params: AWS.S3.PutObjectRequest = {
        Bucket: process.env.CHART_IMAGE_STORAGE_BUCKET_NAME,
        Key: key,
        ContentType: 'image/png',
        Body: data,
        ACL: 'public-read',
      };
  
      this.s3.putObject(params, (error, _data) => {
        if (error) reject(error);
        resolve(this.keyToUrl(key));
      });
    });
  }
}

export default new ImageUploader();