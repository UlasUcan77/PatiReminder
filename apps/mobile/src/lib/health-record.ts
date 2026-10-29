import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { renderHealthRecordHtml } from "@patireminder/shared";
import { api } from "./api";

/** Builds the health record PDF and opens the share sheet (WhatsApp, mail, Files…). */
export async function shareHealthRecord(petId: string) {
  const record = await api.healthRecord(petId);
  const { uri } = await Print.printToFileAsync({ html: renderHealthRecordHtml(record) });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
      dialogTitle: `${record.pet.name} sağlık karnesi`,
    });
  } else {
    await Print.printAsync({ uri });
  }
}
