import { renderHealthRecordHtml } from "@patireminder/shared";
import { api } from "./api";

/** Opens the browser's print dialog for a pet's health record ("Save as PDF"). */
export async function printHealthRecord(petId: string) {
  const html = renderHealthRecordHtml(await api.healthRecord(petId));
  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  frame.srcdoc = html;
  frame.onload = () => {
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 1000);
  };
  document.body.appendChild(frame);
}
