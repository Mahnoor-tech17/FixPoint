const multer = require("multer");

const imageTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const documentTypes = ["application/pdf", ...imageTypes];

const photoFilter = (req, file, cb) => {
  if (imageTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid image format. Allowed formats: PNG, JPG, JPEG, WEBP"), false);
  }
};

const docFilter = (req, file, cb) => {
  if (documentTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid document format. Allowed formats: PDF, JPG, JPEG, PNG, WEBP"), false);
  }
};

const storage = multer.memoryStorage();

const uploadPhoto = multer({
  storage,
  fileFilter: photoFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const uploadDocument = multer({
  storage,
  fileFilter: docFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

module.exports = { uploadPhoto, uploadDocument };