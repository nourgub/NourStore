{ pkgs }: {
  deps = [
    pkgs.nodejs_20
    pkgs.mariadb
    # Only needed by scripts/replit-fetch-mysql-binary.mjs's fallback path
    # (a directly-downloaded MySQL binary, used only if the mariadb
    # package above isn't picked up for some reason) — costs nothing to
    # declare here even when mariadb above works fine.
    pkgs.libaio
  ];
}
