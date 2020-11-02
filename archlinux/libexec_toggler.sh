#!/usr/bin/env bash

# set directories for scripts.
INI_FILES=${INI:-"/etc/systemjack"}
SCRIPT_DIR=${SCRIPTS:-"/usr/lib/systemjack"}

# load functions and environment
. "${SCRIPT_DIR}/functions.sh"
. "${INI_FILES}/env.sh"

# and, go!

toggler=$(which toggler)
instance=$1

if [ -z $DISPLAY ]; then
	die "toggler requires a GUI setup"
fi

if [ -x "$toggler" ]; then
	exec $toggler --config=/etc/systemjack/toggler/${instance}.json
else
	die "toggler binary not executable or not found"
fi
