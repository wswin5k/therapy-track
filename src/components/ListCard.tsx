// export function ListCard({ item }: { item: Schedule }) {
// const frequencyLabel = getFrequencyLabel(item.freq);
// const dosesSummary = getDosesSummary(item.doses);
// const dateRange = item.endDate
//     ? `${formatDate(item.startDate)} - ${formatDate(item.endDate)}`
//     : `${formatDate(item.startDate)} - ${t("No end date")}`;

// return (
//     <View style={styles.scheduleItem}>
//     <View style={styles.scheduleContent}>
//         <Text style={styles.medicineName}>{item.medicine.name}</Text>
//         <Text style={styles.frequency}>{frequencyLabel}</Text>
//         <Text style={styles.doses}>{dosesSummary}</Text>
//         <Text style={styles.dateRange}>{dateRange}</Text>
//     </View>
//     <TouchableOpacity
//         style={styles.deleteButton}
//         onPress={() => handleDelete(item.dbId)}
//     >
//         <Text style={styles.deleteButtonText}>{t("Delete")}</Text>
//     </TouchableOpacity>
//     </View>
// );
