/** 把画布、坐标轴和色标合成 PNG。做法对齐 exportThiPng，不引入 html-to-image。 */

export async function downloadThiFigure(root: HTMLElement, background: string, fileName: string): Promise<void> {
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  const width = root.clientWidth;
  const height = root.clientHeight;
  if (width < 2 || height < 2) return;
  const output = document.createElement("canvas");
  output.width = Math.floor(width * ratio);
  output.height = Math.floor(height * ratio);
  const ctx = output.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, output.width, output.height);

  const canvas = root.querySelector("canvas");
  if (canvas) drawBox(ctx, canvas, root, ratio);

  const svg = root.querySelector("svg");
  if (svg) await drawSvg(ctx, svg, root, ratio);

  const strip = root.querySelector(".value-color-bar__strip") as HTMLElement | null;
  if (strip) {
    const box = relativeBox(strip, root);
    const image = getComputedStyle(strip).backgroundImage;
    const colors = image.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)/g);
    if (colors && colors.length) {
      const vertical = box.height > box.width;
      const gradient = vertical
        ? ctx.createLinearGradient(0, (box.y + box.height) * ratio, 0, box.y * ratio)
        : ctx.createLinearGradient(box.x * ratio, 0, (box.x + box.width) * ratio, 0);
      colors.forEach((color, index) => gradient.addColorStop(colors.length === 1 ? 0 : index / (colors.length - 1), color));
      ctx.fillStyle = gradient;
      ctx.fillRect(box.x * ratio, box.y * ratio, box.width * ratio, box.height * ratio);
    }
  }
  root.querySelectorAll(".value-color-bar__tick, .value-color-bar__unit").forEach((node) => {
    const el = node as HTMLElement;
    const text = (el.textContent || "").trim();
    if (!text) return;
    const box = relativeBox(el, root);
    const style = getComputedStyle(el);
    ctx.fillStyle = style.color || "#cfe6ff";
    ctx.font = `${parseFloat(style.fontSize) * ratio || 11 * ratio}px sans-serif`;
    ctx.textBaseline = "top";
    ctx.fillText(text, box.x * ratio, box.y * ratio);
  });

  const blob = await new Promise<Blob | null>((resolve) => output.toBlob(resolve, "image/png"));
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function relativeBox(el: Element, root: HTMLElement): { x: number; y: number; width: number; height: number } {
  const outer = root.getBoundingClientRect();
  const box = el.getBoundingClientRect();
  return { x: box.left - outer.left, y: box.top - outer.top, width: box.width, height: box.height };
}

function drawBox(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, root: HTMLElement, ratio: number): void {
  const box = relativeBox(canvas, root);
  ctx.drawImage(canvas, box.x * ratio, box.y * ratio, box.width * ratio, box.height * ratio);
}

async function drawSvg(ctx: CanvasRenderingContext2D, svg: SVGSVGElement, root: HTMLElement, ratio: number): Promise<void> {
  const box = relativeBox(svg, root);
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(box.width));
  clone.setAttribute("height", String(box.height));
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = await loadImage(url);
    ctx.drawImage(image, box.x * ratio, box.y * ratio, box.width * ratio, box.height * ratio);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("image load failed"));
    image.src = url;
  });
}
