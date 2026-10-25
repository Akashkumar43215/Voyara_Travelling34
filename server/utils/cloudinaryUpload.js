const cloudinary = require("../config/cloudinary");

const uploadImage = async (imagePath, folder = "voyara") => {
  try {
    const result = await cloudinary.uploader.upload(imagePath, {
      folder,
      resource_type: "image",
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error("Cloudinary Upload Error:", error.message);
    throw error;
  }
};

module.exports = uploadImage;