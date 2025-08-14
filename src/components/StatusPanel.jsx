export function StatusPanel({
  user,
  username,
  currentStatus,
  isLoadingStatus,
  handleStartWash,
  handleDone,
  handleAcceptNext,
}) {
  const isMine = currentStatus.uid && currentStatus.uid === user?.uid;
  const isNextMine = currentStatus.next?.uid === user?.uid;

  let currentTextColor;
  let currentBGColor;
  switch (currentStatus.phase) {
    case "free":
      currentTextColor = "text-green-500";
      currentBGColor = "bg-green-950";
      break;
    case "busy":
      currentTextColor = isMine ? "text-green-500" : "text-red-500";
      currentBGColor = isMine ? "bg-green-950" : "bg-red-950";
      break;
    case "paused":
      currentTextColor = "text-yellow-500";
      currentBGColor = "bg-yellow-950";
      break;
    default:
      currentTextColor = "text-gray-500";
      currentBGColor = "bg-zinc-100";
  }
  return (
    <div className="flex w-full flex-col items-center justify-center pb-4">
      <h1 className="mb-10 mt-10 text-4xl font-semibold">Hallo, {username || user.email}!</h1>
      <div
        className={`${currentTextColor} ${currentBGColor} w-full flex flex-col h-72 min-h-[17rem] items-stretch p-5 shadow-xl rounded-xl`}
        style={{
          boxShadow: `  0 0 15px 10px ${
            currentTextColor === "text-green-500"
              ? "#22c55e"
              : currentTextColor === "text-red-500"
                ? "#ef4444"
                : currentTextColor === "text-yellow-500"
                  ? "#eab308"
                  : currentTextColor === "text-gray-500"
                    ? "#6b7280"
                    : "#a1a1aa"
          }`,
        }}
      >
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          {currentStatus.phase === "free" && (
            <div className="flex flex-col items-center gap-0">
              <p className="text-lg font-semibold text-gray-100">Die Waschmaschine ist</p>
              <p className="pb-8 pt-6 text-5xl font-bold">Frei</p>
            </div>
          )}
          {currentStatus.phase === "busy" && (
            <div className="flex flex-col items-center gap-0">
              <p className="text-lg font-semibold text-gray-100">Gerade wäscht:</p>
              <p className="pb-8 pt-6 text-5xl font-bold">{isMine ? "Du" : currentStatus.name}</p>
            </div>
          )}
          {currentStatus.phase === "paused" && (
            <div className="flex flex-col items-center gap-0">
              <p className="text-lg font-semibold text-gray-100">Pausiert – warten auf:</p>
              <p className="pb-8 pt-6 text-5xl font-bold">
                {isNextMine ? "Dich" : currentStatus.next?.name}
              </p>
            </div>
          )}
        </div>
        <div className="mb-6 mt-auto flex w-full flex-col items-center gap-3">
          {currentStatus.phase === "free" && (
            <button
              className="w-fit rounded-lg bg-green-600 px-5 py-4 pt-3.5 text-2xl font-bold text-green-100 transition hover:bg-green-700"
              onClick={handleStartWash}
              disabled={isLoadingStatus}
            >
              Waschgang starten
            </button>
          )}
          {currentStatus.phase === "busy" && isMine && (
            <button
              className="w-fit rounded-lg bg-red-600 px-5 py-4 pt-3.5 text-2xl font-bold text-red-100 transition hover:bg-red-700"
              onClick={handleDone}
            >
              Waschgang beenden
            </button>
          )}
          {currentStatus.phase === "paused" && currentStatus.next?.uid === user.uid && (
            <button
              className="w-fit rounded-lg bg-yellow-500 px-5 py-4 pt-3.5 text-2xl font-bold text-yellow-100 transition hover:bg-yellow-700"
              onClick={handleAcceptNext}
            >
              Ich wasche jetzt
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
