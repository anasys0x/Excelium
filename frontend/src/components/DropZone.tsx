import * as XLSX from 'xlsx'

type CellValue = string | number | boolean | Date | null

interface Props {
    onFileParsed: (data: CellValue[][]) => void
}

function DropZone({ onFileParsed }: Props) {
    return(
        <div>

        </div>
    )
}

  export default DropZone