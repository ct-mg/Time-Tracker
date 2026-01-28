import { format, parseISO, differenceInMilliseconds, subDays, startOfDay, isSameDay } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { TimeEntry, DateRange } from '../types/time-tracker';

/**
 * Service for exporting time entries to various formats
 */

export function exportToCSV(entries: TimeEntry[]) {
    if (entries.length === 0) return;

    try {
        const data = entries.map(e => {
            const startDate = parseISO(e.startTime);
            const endDate = e.endTime ? parseISO(e.endTime) : null;
            const durationMs = endDate ? differenceInMilliseconds(endDate, startDate) : 0;

            return {
                'Date': format(startDate, 'yyyy-MM-dd'),
                'Start': format(startDate, 'HH:mm'),
                'End': endDate ? format(endDate, 'HH:mm') : '...',
                'Category': e.categoryName,
                'Description': e.description,
                'Duration (h)': Number((durationMs / 3600000).toFixed(2)),
                'Is Break': e.isBreak ? 'Yes' : 'No',
                'User': e.userName || e.userId
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Time Entries');

        XLSX.writeFile(workbook, `time-entries-export-${format(new Date(), 'yyyy-MM-dd-HHmm')}.xlsx`);
    } catch (err) {
        console.error('CSV Export failed:', err);
    }
}

function drawTrendChart(doc: jsPDF, data: any[], x: number, y: number, width: number, height: number) {
    const padding = 10;
    const chartWidth = width - (padding * 2);
    const chartHeight = height - (padding * 2);
    const barWidth = chartWidth / data.length;
    const maxHours = Math.max(...data.map(d => d.hours), 8);

    // Draw background
    doc.setFillColor(249, 250, 251); // Gray 50
    doc.rect(x, y, width, height, 'F');
    doc.setDrawColor(229, 231, 235); // Gray 200
    doc.rect(x, y, width, height, 'S');

    // Draw bars
    data.forEach((day, i) => {
        const barHeight = (day.hours / maxHours) * (chartHeight - 10);
        const barX = x + padding + (i * barWidth) + (barWidth * 0.1);
        const barY = y + height - padding - barHeight - 5;
        const currentBarWidth = barWidth * 0.8;

        doc.setFillColor(59, 130, 246); // Blue 500
        doc.rect(barX, barY, currentBarWidth, barHeight, 'F');

        // Label (Date)
        doc.setFontSize(7);
        doc.setTextColor(107, 114, 128); // Gray 500
        doc.text(day.labelShort, barX + (currentBarWidth / 2), y + height - padding + 2, { align: 'center' });

        // Value (Hours)
        if (day.hours > 0) {
            doc.setTextColor(55, 65, 81); // Gray 700
            doc.text(`${day.hours.toFixed(1)}h`, barX + (currentBarWidth / 2), barY - 2, { align: 'center' });
        }
    });
}

export function exportToPDF(
    entries: TimeEntry[],
    categories: any[],
    userName: string,
    dateRange: DateRange
) {
    if (entries.length === 0) return;

    try {
        const doc = new jsPDF();

        // Title
        doc.setFontSize(18);
        doc.text('Time Tracker Report', 14, 22);

        doc.setFontSize(11);
        doc.setTextColor(100);

        // Header Info
        doc.text(`User: ${userName}`, 14, 32);
        doc.text(`Generated: ${format(new Date(), 'dd.MM.yyyy HH:mm')}`, 14, 38);

        // Period
        if (dateRange.start && dateRange.end) {
            const period = `${format(dateRange.start, 'dd.MM.yyyy')} - ${format(dateRange.end, 'dd.MM.yyyy')}`;
            doc.text(`Period: ${period}`, 14, 44);
        }

        // Summary Stats (Categories)
        const totalHours = categories.reduce((acc, curr) => acc + curr.totalHours, 0);

        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text('Summary', 14, 55);

        doc.setFontSize(11);
        doc.text(`Total working hours: ${totalHours.toFixed(1)}h`, 14, 62);

        let yPos = 70;
        categories.forEach(stat => {
            doc.text(`${stat.name}: ${stat.totalHours.toFixed(1)}h`, 20, yPos);
            yPos += 6;
        });

        // Trend Chart (Last 7 Days)
        const trendData = [];
        const now = new Date();
        for (let i = 6; i >= 0; i--) {
            const date = subDays(now, i);
            const dayStart = startOfDay(date);
            const dayEntries = entries.filter(e => isSameDay(parseISO(e.startTime), dayStart));
            const ms = dayEntries.reduce((sum, e) => {
                const start = parseISO(e.startTime);
                const end = e.endTime ? parseISO(e.endTime) : new Date();
                return sum + (e.isBreak ? 0 : differenceInMilliseconds(end, start));
            }, 0);
            trendData.push({
                labelShort: format(date, 'dd.MM.'),
                hours: ms / 3600000
            });
        }

        doc.setFontSize(12);
        doc.text('Last 7 Days Trend', 14, yPos + 10);
        drawTrendChart(doc, trendData, 14, yPos + 15, 180, 40);
        yPos += 65;

        // Table
        const tableData = entries.map(e => {
            const startDate = parseISO(e.startTime);
            const endDate = e.endTime ? parseISO(e.endTime) : null;
            const durationMs = endDate ? differenceInMilliseconds(endDate, startDate) : 0;

            return [
                format(startDate, 'dd.MM.yyyy'),
                format(startDate, 'HH:mm'),
                endDate ? format(endDate, 'HH:mm') : '...',
                e.categoryName,
                e.description || '-',
                (durationMs / 3600000).toFixed(2) + 'h',
                e.userName || '-'
            ];
        });

        autoTable(doc, {
            startY: yPos,
            head: [['Date', 'Start', 'End', 'Category', 'Description', 'Duration', 'User']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [0, 123, 255] }
        });

        doc.save(`time-tracker-report-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`);
    } catch (err) {
        console.error('PDF Export failed:', err);
    }
}
