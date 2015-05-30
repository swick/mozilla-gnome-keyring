# The name of the extension.
extension_name := gnome-keyring-integration

# The UUID of the extension.
extension_uuid := gnome-keyring-integration@sebastianwick.net

# The zip application to be used.
ZIP := zip

# The target location of the build and build files.
bin_dir := ./bin

# The target XPI file.
xpi_file := $(bin_dir)/$(extension_name).xpi

# This builds the extension XPI file.
.PHONY: all
all: $(xpi_file)
	@echo
	@echo "Build finished successfully."
	@echo

# This cleans all temporary files and directories created by 'make'.
.PHONY: clean
clean:
	@rm -f $(xpi_file)
	@rmdir $(bin_dir)
	@echo "Cleanup is done."

# The sources for the XPI file.
xpi_built := install.rdf \
             chrome.manifest \
             $(wildcard components/*.js) \
             $(wildcard content/*.js) \
             $(wildcard content/*.xul) \
             $(wildcard defaults/preferences/*.js)

$(xpi_file): $(xpi_built) Makefile
	@echo "Creating XPI file."
	@mkdir -p $(bin_dir)
	@$(ZIP) $(xpi_file) $(xpi_built)
	@echo "Creating XPI file. Done!"
