import * as XLSX from 'xlsx';
import { RequestItem } from '../types';

const formatDateForExport = (dateString: string): string => {
  if (!dateString || dateString === '-' || dateString === 'Indefinido') {
    return dateString || '-';
  }

  const [year, month, day] = dateString.split('-');
  if (!year || !month || !day) {
    return dateString;
  }

  return `${day}/${month}/${year}`;
};

const getTodayIsoDate = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const exportRequestsToExcel = async (
  requests: RequestItem[],
  fileNamePrefix = 'requerimientos_sst'
): Promise<void> => {
  const rows = requests.map((req) => ({
    NOMBRE: req.name || '-',
    RUT: req.rut || '-',
    REQUERIMIENTO: req.requirement || '-',
    CATEGORIA: req.category || '-',
    ESTADO: req.status || '-',
    FECHA_ADJUDICACION: formatDateForExport(req.adjudicationDate),
    FECHA_VENCIMIENTO: formatDateForExport(req.expirationDate),
    DOCUMENTO_URL: req.link || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 32 },
    { wch: 18 },
    { wch: 24 },
    { wch: 18 },
    { wch: 18 },
    { wch: 20 },
    { wch: 20 },
    { wch: 55 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Requerimientos SST');

  const normalizedPrefix = fileNamePrefix.trim() || 'requerimientos_sst';
  const fileName = `${normalizedPrefix}_${getTodayIsoDate()}.xlsx`;

  XLSX.writeFile(workbook, fileName);
};
