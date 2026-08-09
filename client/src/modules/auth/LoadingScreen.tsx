"use client";

export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="h-10 w-10 rounded-full border-2 border-gray-200 border-t-amber-500 animate-spin" />
    </div>
  );
}
