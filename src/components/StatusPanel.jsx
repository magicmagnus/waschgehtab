import { WashTimer } from "./WashTimer";

export function StatusPanel({
    user,
    username,
    currentStatus,
    isLoadingStatus,
    handleStartWash,
    handleDone,
    handleAcceptNext,
    onTimerEnd,
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
    const panelClasses = `${currentTextColor} ${currentBGColor} w-full flex flex-col h-80 min-h-[17rem] items-stretch p-6 shadow-xl border rounded-lg`;
    const buttonBase = "w-fit h-fit rounded-lg px-5 py-4 pt-3.5 text-2xl font-bold transition ";
    const buttonVariants = {
        start: "bg-green-600 text-green-100 hover:bg-green-700",
        done: "bg-red-600 text-red-100 hover:bg-red-700",
        accept: "animate-pulse bg-yellow-500 text-yellow-100 hover:bg-yellow-700",
    };

    return (
        <div className="flex w-full flex-col items-center justify-center">
            <h1 className="mb-8 mt-8 text-4xl font-semibold">Hallo, {username || user.email}!</h1>
            <div className={panelClasses}>
                <div className="flex flex-1 flex-col items-center justify-between gap-4 text-center">
                    {currentStatus.phase === "free" && (
                        <>
                            <StatusText title="Die Waschmaschine ist" main="Frei" />
                            <button
                                className={`${buttonBase} ${buttonVariants.start}`}
                                onClick={handleStartWash}
                                disabled={isLoadingStatus}
                            >
                                Waschgang starten
                            </button>
                        </>
                    )}
                    {currentStatus.phase === "busy" && (
                        <>
                            <StatusText
                                title={isMine ? "Gerade wasche:" : "Gerade wäscht:"}
                                main={isMine ? "Ich" : currentStatus.name}
                                extra={
                                    <WashTimer
                                        currentStatus={currentStatus}
                                        user={user}
                                        onTimerEnd={onTimerEnd}
                                    />
                                }
                            />
                            {isMine && (
                                <button
                                    className={`${buttonBase} ${buttonVariants.done}`}
                                    onClick={handleDone}
                                >
                                    Waschgang beenden
                                </button>
                            )}
                        </>
                    )}
                    {currentStatus.phase === "paused" && (
                        <>
                            <StatusText
                                title="Pausiert - warten auf:"
                                main={isNextMine ? "Dich" : currentStatus.next?.name}
                            />
                            {isNextMine && (
                                <button
                                    className={`${buttonBase} ${buttonVariants.accept}`}
                                    onClick={handleAcceptNext}
                                    data-action="accept-wash"
                                >
                                    Ich wasche jetzt
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );

    // Helper component for status text
    function StatusText({ title, main, extra }) {
        return (
            <div className="flex h-fit flex-1 flex-col items-center justify-center gap-3">
                <p className="-mt-1 text-lg font-semibold text-gray-100">{title}</p>
                <div className="flex flex-1 flex-col justify-center">
                    <p className="-mt-2 text-5xl font-bold">{main}</p>
                </div>
                {extra}
            </div>
        );
    }
}
