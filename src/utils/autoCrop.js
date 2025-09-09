/* global cv */


export const loadImage = (file) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = URL.createObjectURL(file);
  });
};

export const autoCrop = async (file, debug = false) => {
  const img = await loadImage(file);
  const mat = cv.imread(img);


  const gray = new cv.Mat();
  cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);

  const thresh = new cv.Mat();
  cv.adaptiveThreshold(
    gray,
    thresh,
    255,
    cv.ADAPTIVE_THRESH_GAUSSIAN_C,
    cv.THRESH_BINARY,
    11,
    2
  );

  const kernel = cv.Mat.ones(5, 5, cv.CV_8U);
  cv.morphologyEx(thresh, thresh, cv.MORPH_CLOSE, kernel);

  const edged = new cv.Mat();
  cv.Canny(thresh, edged, 50, 150);

 
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(
    edged,
    contours,
    hierarchy,
    cv.RETR_LIST,
    cv.CHAIN_APPROX_SIMPLE
  );

  let maxArea = 0;
  let docCnt = null;

  for (let i = 0; i < contours.size(); i++) {
    const c = contours.get(i);
    const peri = cv.arcLength(c, true);
    const approx = new cv.Mat();
    cv.approxPolyDP(c, approx, 0.02 * peri, true);

    const area = cv.contourArea(approx);
    if (approx.rows === 4 && area > 50000) {
      if (area > maxArea) {
        maxArea = area;
        if (docCnt) docCnt.delete();
        docCnt = approx;
      } else {
        approx.delete();
      }
    } else {
      approx.delete();
    }
    c.delete();
  }

  let dst;
  if (docCnt) {
   
    const data = docCnt.data32S;
    const pts = [
      { x: data[0], y: data[1] },
      { x: data[2], y: data[3] },
      { x: data[4], y: data[5] },
      { x: data[6], y: data[7] },
    ];


    pts.sort((a, b) => a.y - b.y);
    const top = pts.slice(0, 2).sort((a, b) => a.x - b.x);
    const bottom = pts.slice(2, 4).sort((a, b) => a.x - b.x);
    const ordered = [top[0], top[1], bottom[1], bottom[0]];

    const widthA = Math.hypot(
      ordered[2].x - ordered[3].x,
      ordered[2].y - ordered[3].y
    );
    const widthB = Math.hypot(
      ordered[1].x - ordered[0].x,
      ordered[1].y - ordered[0].y
    );
    const maxWidth = Math.max(widthA, widthB);

    const heightA = Math.hypot(
      ordered[1].x - ordered[2].x,
      ordered[1].y - ordered[2].y
    );
    const heightB = Math.hypot(
      ordered[0].x - ordered[3].x,
      ordered[0].y - ordered[3].y
    );
    const maxHeight = Math.max(heightA, heightB);

    const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
      ordered[0].x,
      ordered[0].y,
      ordered[1].x,
      ordered[1].y,
      ordered[2].x,
      ordered[2].y,
      ordered[3].x,
      ordered[3].y,
    ]);
    const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
      0,
      0,
      maxWidth - 1,
      0,
      maxWidth - 1,
      maxHeight - 1,
      0,
      maxHeight - 1,
    ]);

    const M = cv.getPerspectiveTransform(srcTri, dstTri);
    dst = new cv.Mat();
    cv.warpPerspective(mat, dst, M, new cv.Size(maxWidth, maxHeight));

    srcTri.delete();
    dstTri.delete();
    M.delete();

    // --- Auto rotate if landscape ---
    if (dst.cols > dst.rows) {
      const center = new cv.Point(dst.cols / 2, dst.rows / 2);
      const rotMat = cv.getRotationMatrix2D(center, 90, 1.0);
      const rotated = new cv.Mat();
      cv.warpAffine(dst, rotated, rotMat, new cv.Size(dst.rows, dst.cols));
      dst.delete();
      dst = rotated;
      rotMat.delete();
    }
  } else {
    dst = mat.clone(); 
  }

 
  if (debug) {
    const matDebug = mat.clone();
    const colorAll = new cv.Scalar(0, 255, 0, 255);
    const colorDoc = new cv.Scalar(255, 0, 0, 255);

    for (let i = 0; i < contours.size(); i++) {
      cv.drawContours(matDebug, contours, i, colorAll, 1);
    }
    if (docCnt) {
      const tmpVec = new cv.MatVector();
      tmpVec.push_back(docCnt);
      cv.drawContours(matDebug, tmpVec, -1, colorDoc, 3);
      tmpVec.delete();
    }

    const dbgCanvas = document.createElement("canvas");
    cv.imshow(dbgCanvas, matDebug);
    dbgCanvas.style.border = "2px solid black";
    dbgCanvas.style.margin = "10px";
    document.body.appendChild(dbgCanvas);

    const croppedCanvas = document.createElement("canvas");
    cv.imshow(croppedCanvas, dst);
    croppedCanvas.style.border = "2px solid red";
    croppedCanvas.style.margin = "10px";
    document.body.appendChild(croppedCanvas);

    matDebug.delete();
  }


  const canvas = document.createElement("canvas");
  cv.imshow(canvas, dst);

  const croppedFile = await new Promise((resolve) =>
    canvas.toBlob(
      (blob) =>
        resolve(
          new File([blob], file.name.replace(/\.[^/.]+$/, ".cropped.png"), {
            type: "image/png",
          })
        ),
      "image/png"
    )
  );

  
  mat.delete();
  gray.delete();
  thresh.delete();
  edged.delete();
  contours.delete();
  hierarchy.delete();
  kernel.delete();
  if (docCnt) docCnt.delete();
  dst.delete();

  return croppedFile;
};
