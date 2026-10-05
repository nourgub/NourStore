#!/bin/bash
set -e
cd "$(dirname "$0")"
P=/usr/local/lib/python3.11/dist-packages/pypandoc/files/pandoc
$P book.md -f markdown-implicit_figures+raw_attribute -o raw.docx -M dir=rtl -M lang=ar --toc --toc-depth=1 -M toc-title="الفهرس"
python3 post.py raw.docx book.docx
bash pdfvariant.sh "$PWD/book.docx" "$PWD/pdf.docx"
rm -rf out; mkdir out
SAL_USE_VCLPLUGIN=svp soffice -env:UserInstallation=file:///tmp/lo/prof --headless --convert-to pdf --outdir out pdf.docx >/dev/null 2>&1
python3 mktoc.py out/pdf.pdf toc.new.json
cp book.docx ../Excel-Nourix-Academy.docx
cp out/pdf.pdf ../Excel-Nourix-Academy.pdf
