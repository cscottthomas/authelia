
import jslogger = require("js-logger");

interface QRCode {
  (element: HTMLElement, value: string): void;
}

export default function(window: Window, $: JQueryStatic) {
  jslogger.debug("Creating QRCode from OTPAuth url");
  const qrcode = $("#qrcode");
  const val = qrcode.text();
  qrcode.empty();
  new (window as any).QRCode(qrcode.get(0), val);
}
