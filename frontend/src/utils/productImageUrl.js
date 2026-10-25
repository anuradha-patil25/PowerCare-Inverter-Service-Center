export default function getProductImageUrl(image) {
  if (!image || typeof image !== "string") {
    return "";
  }

  let imagePath = image.trim();

  try {
    if (/^https?:\/\//i.test(imagePath)) {
      imagePath = new URL(imagePath).pathname;
    }
  } catch {
    return "";
  }

  imagePath = imagePath.replace(/^\/+/, "");
  imagePath = imagePath.replace(/^media\//, "");

  if (imagePath.startsWith("products/")) {
    return `/${imagePath}`;
  }

  return `/${imagePath}`;
}