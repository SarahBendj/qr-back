import * as bcrypt from 'bcrypt';

export async function hashing(code?: string) {

  let accessCodePlain: string;

  if (!code) {
    accessCodePlain = Math.random().toString(36).substring(2, 8).toUpperCase();
  } else {
    accessCodePlain = code;
  }

  // Hash du code
  const accessCode = await bcrypt.hash(accessCodePlain, 10);
  console.log(accessCode)

  return {
    plain: accessCodePlain,   
    hashed: accessCode,      
  };
}
