#!/bin/sh

# Run this script to package all necessary extension files into a .zip

root_dir=$PWD
zip_filename="improvedosk@nick-shmyrev.dev.shell-extension.zip"

# Remove existing .zip file
rm -f './$zip_filename'

# Compile gnome-shell-osk-layouts.gresource file before packaging extension
cd './src/data'
./compile-gresource.sh

cd $root_dir

# Create expected .zip folders structure
mkdir dist
cd dist
cp "../src/extension.js" "./extension.js"
cp "../src/prefs.js" "./prefs.js"
cp "../src/metadata.json" "./metadata.json"
cp "../src/stylesheet.css" "./stylesheet.css"
cp -r "../src/schemas/" "./schemas/"
cp "../LICENSE" "./LICENSE"
cp "../README.md" "./README.md"

# Add necessary extension files to archive
zip -r "../$zip_filename" ./*

# Cleanup
cd $root_dir
rm -r ./dist
