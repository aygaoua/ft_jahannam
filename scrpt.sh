#!/bin/bash

input_file="rechercher"
output_file="founded.txt"
> "$output_file"

while IFS= read -r var; do
    ldapsearch uid="$var" | awk -v var="$var" '
    $0 ~ "iscsi: /home/"var { found=1 }
    $0 ~ /close: come to bocal/ {
        if (found) {
            print var >> "'"$output_file"'"
        }
        exit
    }'
done < "$input_file"
