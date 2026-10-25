const cloudinary = require("../config/cloudinary");
const mongoose = require("mongoose");

const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file uploaded.",
      });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "voyara/places",
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary Upload Error:", error);

          return res.status(500).json({
            success: false,
            message: "Failed to upload image to Cloudinary.",
          });
        }

        return res.status(200).json({
          success: true,
          message: "Image uploaded successfully.",
          data: {
            url: result.secure_url,
            publicId: result.public_id,
          },
        });
      },
    );

    uploadStream.end(req.file.buffer);
  } catch (error) {
    console.error("Upload Controller Error:", error);

    return res.status(500).json({
      success: false,
      message: "Image upload failed.",
    });
  }
};

module.exports = {
  uploadImage,
};

const TouristPlace = require("../models/TouristPlace");

const uploadPlaceImage = async (req, res) => {
  try {
    const { placeId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file uploaded.",
      });
    }

    const query = mongoose.isValidObjectId(placeId)
      ? { _id: placeId }
      : { slug: placeId };

    const place = await TouristPlace.findOne(query);

    if (!place) {
      return res.status(404).json({
        success: false,
        message: "Tourist place not found.",
      });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "voyara/places",
        resource_type: "image",
      },
      async (error, result) => {
        if (error) {
          console.error("Cloudinary Upload Error:", error);

          return res.status(500).json({
            success: false,
            message: "Failed to upload image to Cloudinary.",
          });
        }

        try {
          place.image = result.secure_url;
          place.cloudinaryPublicId = result.public_id;

          await place.save();

          return res.status(200).json({
            success: true,
            message: "Tourist place image updated successfully.",
            data: {
              placeId: place._id,
              placeName: place.name,
              image: place.image,
              cloudinaryPublicId: place.cloudinaryPublicId,
            },
          });
        } catch (dbError) {
          console.error("Database Update Error:", dbError);

          return res.status(500).json({
            success: false,
            message: "Image uploaded, but database update failed.",
          });
        }
      },
    );

    uploadStream.end(req.file.buffer);
  } catch (error) {
    console.error("Place Image Upload Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update tourist place image.",
    });
  }
};

module.exports = {
  uploadImage,
  uploadPlaceImage,
};
