const mongoose = require("mongoose");

async function clearLegacyProductImages() {
  const mongoUrl = process.env.MONGODB_URL;
  if (!mongoUrl) {
    throw new Error("MONGODB_URL is required");
  }

  await mongoose.connect(mongoUrl);
  const result = await mongoose.connection.collection("products").updateMany(
    {
      imageUrl: { $exists: true },
      $or: [
        { imagePath: { $exists: false } },
        { imagePath: null },
        { imagePath: "" },
      ],
    },
    { $unset: { imageUrl: "", imagePath: "" } },
  );

  console.log(`Cleared legacy images from ${result.modifiedCount} products.`);
}

clearLegacyProductImages()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
