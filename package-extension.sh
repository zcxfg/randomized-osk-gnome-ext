#!/bin/sh

# Run this script to package all necessary extension files into a .zip

root_dir=$PWD
zip_filename="improvedosk@nick-shmyrev.dev.shell-extension.zip"

# Remove existing .zip
rm -f "$zip_filename"

cd "$root_dir" || exit

# Create expected .zip folders structure
mkdir dist
cp LICENSE README.md ./*.js metadata.json stylesheet.css dist/
mkdir dist/schemas
cp schemas/gschemas.compiled schemas/org.gnome.shell.extensions.improvedosk.gschema.xml dist/schemas/

# Add necessary extension files to archive
cd dist/ || exit
zip -r "../$zip_filename" ./*
cd "$root_dir" || exit

# Cleanup
rm -r dist
