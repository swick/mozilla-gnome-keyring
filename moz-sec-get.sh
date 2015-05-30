#!/bin/sh
# Looks up a mozilla-gnome-keyring password and copies it to a clipboard for 16s.
# Requires xclip(1) and secret-tool(1).

test -n "$1" || { echo >&2 "Usage: $0 <host_or_url> [<username>]"; exit 2; }
set -e

host=$(echo "$1" | sed -re 's,^([^:]+://[^/]+)/.*,\1,g')
pass=$( test -n "$2" \
  && secret-tool lookup hostname "$host" username "$2" \
  || secret-tool lookup hostname "$host")

if [ -z "$DISPLAY" ]; then
	echo "$pass"
else
	echo "$pass" | xclip -selection clipboard
	{ sleep 16; echo "" | xclip -selection clipboard; } &
	echo >&2 "copied to clipboard; will clear it after 16s"
fi
