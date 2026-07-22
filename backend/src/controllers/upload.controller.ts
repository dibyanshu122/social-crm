import { Request, Response } from 'express';

export const uploadMedia = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const backendUrl = process.env.BACKEND_URL || 'https://social-crm.onrender.com';
    const fileUrl = `${backendUrl}/uploads/${req.file.filename}`;

    return res.status(200).json({ 
      message: 'File uploaded successfully', 
      url: fileUrl 
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Failed to upload media' });
  }
};
