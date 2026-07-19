"use client";

export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="h-10 w-10 rounded-full border-2 border-slate-800 border-t-indigo-500 animate-spin" />
    </div>
  );
}
