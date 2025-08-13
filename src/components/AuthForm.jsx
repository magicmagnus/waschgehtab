import { useState } from "react";

export function AuthForm({
  isRegister,
  setIsRegister,
  email,
  setEmail,
  password,
  setPassword,
  usernameInput,
  setUsernameInput,
  loading,
  handleRegister,
  handleLogin,
  showUsernameDialog,
  handleSaveUsername,
}) {
  return (
    <div className="flex w-full max-w-xs flex-col items-center rounded-lg bg-zinc-800 p-6 shadow-lg">
      <div className="mb-4 flex w-full gap-2">
        <button
          className={`flex-1 py-2 rounded-l ${!isRegister ? "bg-blue-700" : "bg-zinc-700"} text-white`}
          onClick={() => setIsRegister(false)}
          type="button"
        >
          Login
        </button>
        <button
          className={`flex-1 py-2 rounded-r ${isRegister ? "bg-blue-700" : "bg-zinc-700"} text-white`}
          onClick={() => setIsRegister(true)}
          type="button"
        >
          Registrieren
        </button>
      </div>
      <form
        onSubmit={isRegister ? handleRegister : handleLogin}
        className="flex w-full flex-col items-center"
      >
        <input
          type="email"
          className="mb-2 w-full rounded bg-zinc-700 px-3 py-2 text-gray-100 focus:outline-none"
          placeholder="E-Mail-Adresse"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />
        <input
          type="password"
          className="mb-2 w-full rounded bg-zinc-700 px-3 py-2 text-gray-100 focus:outline-none"
          placeholder="Passwort"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
          minLength={6}
        />

        {isRegister && (
          <input
            type="text"
            className="mb-2 w-full rounded bg-zinc-700 px-3 py-2 text-gray-100 focus:outline-none"
            placeholder="Anzeigename"
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
            required
            maxLength={12}
          />
        )}
        <button
          type="submit"
          className="mt-2 w-full rounded bg-blue-600 px-4 py-2 font-semibold transition hover:bg-blue-700"
          disabled={loading}
        >
          {loading
            ? isRegister
              ? "Registriere..."
              : "Logge ein..."
            : isRegister
              ? "Registrieren"
              : "Login"}
        </button>
      </form>
      {showUsernameDialog && !isRegister && (
        <form onSubmit={handleSaveUsername} className="mt-4 flex w-full flex-col items-center">
          <input
            type="text"
            className="mb-2 w-full rounded bg-zinc-700 px-3 py-2 text-gray-100 focus:outline-none"
            placeholder="Anzeigename"
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
            required
            maxLength={24}
          />
          <button
            type="submit"
            className="w-full rounded bg-blue-600 px-4 py-2 font-semibold transition hover:bg-blue-700"
          >
            Anzeigename speichern
          </button>
        </form>
      )}
    </div>
  );
}
