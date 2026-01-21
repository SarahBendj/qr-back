// r2.service.ts
import { Injectable } from "@nestjs/common";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { r2Client } from "./r2.client";
import { Express } from 'express';


@Injectable()
export class R2Service {
  /**
   * Upload a file to R2 and return its public URL
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: "profile-picture" | "event" | "cv" | "portfolio" | "portfolio/projects",
  ): Promise<string> {
 
    if (!file || !file.buffer) {
      throw new Error("File buffer is empty. Make sure you use Multer memory storage.");
    }

    const key = `${folder}/${randomUUID()}-${file.originalname}`;

    const res = await r2Client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );



    // Return relative path for database or full URL
    return `${key}`;
  }

   async deleteFile(key: string): Promise<void> {
    const res =await r2Client.send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
      }),
    );
 
  }
}
