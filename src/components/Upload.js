import React, { useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { storage, db } from "../firebase";
import * as pdfjsLib from "pdfjs-dist";
import { autoCrop } from "../utils/autoCrop";

// PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.js`;

function Upload({ userId }) {
  const [file, setFile] = useState(null);
  const [beforeURL, setBeforeURL] = useState(null);
  const [afterURL, setAfterURL] = useState(null);
  const [loading, setLoading] = useState(false);

  // Convert PDF first page or image file to HTMLImageElement
  const handleFileChange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setLoading(true);

    let imageFile = f;
    let previewURL = URL.createObjectURL(f);

    if (f.type === "application/pdf") {
      const buffer = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      const page = await pdf.getPage(1);

      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext("2d"), viewport })
        .promise;

      const blob = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/png")
      );
      imageFile = new File([blob], f.name.replace(".pdf", ".png"), {
        type: "image/png",
      });
      previewURL = URL.createObjectURL(imageFile);
    }

    setFile(imageFile);
    setBeforeURL(previewURL);
    setAfterURL(null); // reset previous crop
    setLoading(false);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);

    try {
      // Auto-crop image using OpenCV.js
      const croppedFile = await autoCrop(file, true);

      // Upload original
      const origRef = ref(storage, `uploads/original/${file.name}`);
      await uploadBytes(origRef, file);
      const origURL = await getDownloadURL(origRef);

      // Upload cropped
      const cropRef = ref(storage, `uploads/cropped/${croppedFile.name}`);
      await uploadBytes(cropRef, croppedFile);
      const cropURL = await getDownloadURL(cropRef);

      setAfterURL(cropURL);

      // Save metadata to Firestore
      await addDoc(collection(db, "uploads"), {
        userId,
        filename: file.name,
        origURL,
        cropURL,
        timestamp: serverTimestamp(),
        status: "done",
      });
    } catch (err) {
      console.error(err);
      alert("Upload failed! Check console for details.");
    }

    setLoading(false);
  };

  return (
    <div style={{ marginTop: "20px" }}>
      <input
        type="file"
        accept=".png,.jpg,.jpeg,.pdf"
        onChange={handleFileChange}
      />
      <button
        onClick={handleUpload}
        disabled={loading || !file}
        style={{ marginLeft: "10px" }}
      >
        {loading ? "Processing..." : "Upload"}
      </button>

      {(beforeURL || afterURL) && (
        <div style={{ display: "flex", gap: "30px", marginTop: "20px" }}>
          {beforeURL && (
            <div>
              <h4>Before</h4>
              <img
                src={beforeURL}
                alt="before"
                width={200}
                style={{ border: "1px solid #ccc" }}
              />
            </div>
          )}
          {afterURL && (
            <div>
              <h4>After</h4>
              <img
                src={afterURL}
                alt="after"
                width={200}
                style={{ border: "1px solid #ccc" }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Upload;
