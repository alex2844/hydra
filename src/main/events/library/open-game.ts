import { gameRepository } from "@main/repository";

import { registerEvent } from "../register-event";
import { shell } from "electron";
import { parseExecutablePath } from "../helpers/parse-executable-path";
import { spawnSync, exec } from "node:child_process";
import fs from "node:fs";

const openGame = async (
  _event: Electron.IpcMainInvokeEvent,
  gameId: number,
  executablePath: string
) => {
  const parsedPath = parseExecutablePath(executablePath);

  await gameRepository.update({ id: gameId }, { executablePath: parsedPath });

  if (process.platform === "win32") {
	shell.openPath(parsedPath);
    return true;
  }

  if (spawnSync("which", ["wine"]).status === 0) {
    exec(`wine "${parsedPath}"`);
    return true;
  }

	const STEAM_COMPAT_CLIENT_INSTALL_PATH = `${process.env.HOME}/.local/share/Steam`;
	if (fs.existsSync(STEAM_COMPAT_CLIENT_INSTALL_PATH)) {
		const [ ver ] = fs.readdirSync(`${STEAM_COMPAT_CLIENT_INSTALL_PATH}/steamapps/common/`).filter(proton => proton.startsWith('Proton '));
		if (ver) {
			const STEAM_COMPAT_MOUNTS = `${STEAM_COMPAT_CLIENT_INSTALL_PATH}/steamapps/common/${ver}`;
			const STEAM_COMPAT_DATA_PATH = `${process.env.HOME}/.config/hydra/compatdata/${gameId}`;
			const WINEPREFIX = `${STEAM_COMPAT_DATA_PATH}/pfx`;
			if (!fs.existsSync(`${WINEPREFIX}/drive_c`))
				fs.mkdirSync(`${WINEPREFIX}/drive_c`, { recursive: true });
			exec(`"${STEAM_COMPAT_MOUNTS}/proton" run "${parsedPath}"`, {
				env: {
					...process.env,
					STEAM_COMPAT_CLIENT_INSTALL_PATH,
					STEAM_COMPAT_MOUNTS,
					STEAM_COMPAT_DATA_PATH,
					WINEPREFIX
				}
			});
			return true;
		}
	}

  return false;
};

registerEvent("openGame", openGame);
