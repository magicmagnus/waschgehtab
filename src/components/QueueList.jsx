export function QueueList({ queue, user, currentStatus, onRemove, onJoin }) {
  return (
    <div className="mt-6 w-full rounded-lg border border-zinc-600 bg-zinc-800 p-4 shadow-lg">
      <div className="flex items-center justify-between gap-2">
        <h2 className="ml-1 text-2xl font-semibold">Warteschlange</h2>
        {currentStatus.phase !== "free" && (
          <button
            type="button"
            onClick={onJoin}
            className="flex items-center justify-center rounded-lg bg-indigo-600 px-2 py-1 text-xs transition hover:bg-indigo-700"
          >
            <i className="fa-solid fa-plus mr-2 text-xl"></i>
            <p className="text-lg font-semibold">Anstellen</p>
          </button>
        )}
      </div>
      <div className="mt-4 h-0.5 rounded-full bg-zinc-400"></div>
      {queue.length === 0 ? (
        <p className="text-gray-400">Niemand wartet...</p>
      ) : (
        <ul className="mt-2 list-inside list-disc">
          {queue.map((entry, index) => (
            <li key={entry.id} className="mt-0 flex items-center justify-between">
              <div className="-mb-2 flex items-start">
                <div className="mr-2 mt-2.5 flex flex-col items-center justify-center">
                  <div className="z-20 h-2 w-2 rounded-full bg-gray-500"></div>
                  {index != queue.length - 1 && (
                    <div className="z-10 -mb-1 -mt-1 h-8 w-0.5 rounded-full bg-gray-500"></div>
                  )}
                </div>
                <span className="text-lg">{entry.name}</span>
              </div>
              {entry.uid === user.uid && (
                <button className="ml-2 text-xs text-red-400" onClick={() => onRemove(entry.id)}>
                  <i className="fa-solid fa-trash mr-2"></i>
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
