import { useState, useRef } from "react";
import { Upload, Loader2 } from "lucide-react";
import { uploadImage } from "../../api/uploads.js";
import toast from "react-hot-toast";

export default function ImageUploader({
  value,
  onChange,
  label = "Upload",
  round,
}) {
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadImage(file);
      onChange(url);
    } catch (err) {
      toast.error("Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className={`w-20 h-20 ${round ? "rounded-full" : "rounded-lg"} bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-primary-500`}
      >
        {busy ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : value ? (
          <img src={value} alt="" className="w-full h-full object-cover" />
        ) : (
          <Upload className="w-5 h-5 text-slate-400" />
        )}
      </button>
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-slate-500">PNG/JPG · max 5MB</div>
      </div>
      <input ref={ref} type="file" accept="image/*" hidden onChange={onPick} />
    </div>
  );
}
