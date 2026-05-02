export async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    // If file is smaller than 4MB, just read it directly as base64
    const MAX_SIZE = 4 * 1024 * 1024;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      
      if (file.size <= MAX_SIZE) {
        resolve(result);
        return;
      }
      
      // Compress if larger
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        const MAX_DIM = 1024;
        
        if (width > height) {
          if (width > MAX_DIM) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        // Base64 encode as JPEG 85%
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = result;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
