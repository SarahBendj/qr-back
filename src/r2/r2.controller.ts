import { Controller, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { R2Service } from "../r2/r2.service";

@Controller("r2")
export class R2Controller {
  constructor(private readonly r2: R2Service) {}

  // @Post("profile")
  // @UseInterceptors(FileInterceptor("file"))
  // async uploadProfile(@UploadedFile() file: Express.Multer.File) {
  //   if (!file) return { error: "No file uploaded" };

  //   const url = await this.r2.upload(file, "profile");
  //   return { url };
  // }

  // @Post("event")
  // @UseInterceptors(FileInterceptor("file"))
  // async uploadEvent(@UploadedFile() file: Express.Multer.File) {
  //   if (!file) return { error: "No file uploaded" };

  //   const url = await this.r2.upload(file, "events");
  //   return { url };
  // }
}
