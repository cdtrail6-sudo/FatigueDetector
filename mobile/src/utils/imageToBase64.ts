export async function imagePathToBase64(path: string): Promise<string> {
  const res = await fetch(`file://${path}`);
  const blob = await res.blob();

  return await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () =>
      resolve(reader.result!.toString().split(",")[1]);
    reader.readAsDataURL(blob);
  });
}