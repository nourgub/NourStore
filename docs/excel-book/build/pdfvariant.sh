#!/bin/bash
# $1 = input docx (Word edition), $2 = output docx for PDF rendering
set -e
W=/tmp/lo/pdfv; rm -rf $W; mkdir -p $W; cd $W; unzip -oq "$1"
sed -i 's/w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Arial"/w:ascii="Noto Sans" w:hAnsi="Noto Sans" w:cs="Noto Naskh Arabic"/; s/w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Arial"/w:ascii="Noto Sans Mono" w:hAnsi="Noto Sans Mono" w:cs="Noto Naskh Arabic"/g' word/styles.xml
sed -i 's/✅/✔/g' word/document.xml
rm -f "$2"; zip -qr "$2" .
