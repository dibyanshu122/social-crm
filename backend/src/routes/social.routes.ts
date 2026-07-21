import { Router } from 'express';
import { connectAccount, getAccounts, createPost, getPosts, updatePost, deletePost, getAnalytics, updateAccountRole } from '../controllers/social.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Protect all social routes
router.use(requireAuth);

router.post('/accounts', connectAccount);
router.get('/accounts', getAccounts);
router.put('/accounts/:accountId/role', updateAccountRole);

router.post('/posts', createPost);
router.get('/posts', getPosts);
router.put('/posts/:postId', updatePost);
router.delete('/posts/:postId', deletePost);

router.get('/analytics', getAnalytics);

import { uploadMedia } from '../controllers/upload.controller';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Setup multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB max limit for videos and images
});

router.post('/upload', upload.single('media'), uploadMedia);

export default router;
