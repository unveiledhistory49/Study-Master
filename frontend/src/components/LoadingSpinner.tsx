export default function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center h-48">
      <div className="w-6 h-6 border-2 border-[#333333] border-t-white rounded-full animate-spin"></div>
    </div>
  );
}
