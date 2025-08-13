export function QueueList({ queue, user, currentStatus, onRemove, onJoin }) {
  return (
    <div className="mt-2 w-full rounded-lg bg-zinc-800 p-4 shadow-lg">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">Warteschlange</h2>
        {currentStatus.phase !== "free" && (
          <button
            type="button"
            onClick={onJoin}
            className="flex items-center justify-center rounded-lg bg-indigo-600 px-2 py-1 text-xs transition hover:bg-indigo-700"
          >
            <i className="fa-solid fa-plus mr-2 text-xl"></i>
            <p className="text-lg font-semibold">Ich will auch</p>
          </button>
        )}
      </div>
      <div className="mb-3 h-1 border-b border-zinc-600"></div>
      {queue.length === 0 ? (
        <p className="text-gray-400">Niemand wartet...</p>
      ) : (
        <ul className="list-inside list-disc text-gray-200">
          {queue.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between">
              <span>{entry.name}</span>
              {entry.uid === user.uid && (
                <button
                  className="ml-2 text-xs text-red-400 underline"
                  onClick={() => onRemove(entry.id)}
                >
                  Entfernen
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
