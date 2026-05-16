import { useMemo, useState, useCallback, useEffect } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ConnectivityUiConfig } from "@/shared/config";

type PickerMode = "none" | "state" | "district";

export type MandiFilterModalProps = {
  visible: boolean;
  onClose: () => void;
  draftState: string;
  draftDistrict: string;
  onDraftStateChange: (v: string) => void;
  onDraftDistrictChange: (v: string) => void;
  onApply: () => void;
  onReset: () => void;
  states: string[];
  districts: string[];
  statesLoading: boolean;
  districtsLoading: boolean;
  statesError?: boolean;
  districtsError?: boolean;
  listsBlocked?: "offline" | null;
  onRefetchStates?: () => void;
  onRefetchDistricts?: () => void;
  ui: ConnectivityUiConfig;
};

export function MandiFilterModal({
  visible,
  onClose,
  draftState,
  draftDistrict,
  onDraftStateChange,
  onDraftDistrictChange,
  onApply,
  onReset,
  states,
  districts,
  statesLoading,
  districtsLoading,
  statesError = false,
  districtsError = false,
  listsBlocked = null,
  onRefetchStates,
  onRefetchDistricts,
  ui,
}: MandiFilterModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [picker, setPicker] = useState<PickerMode>("none");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (picker === "state") onRefetchStates?.();
    if (picker === "district") onRefetchDistricts?.();
  }, [picker, onRefetchStates, onRefetchDistricts]);

  const openStatePicker = useCallback(() => {
    setSearch("");
    setPicker("state");
  }, []);

  const openDistrictPicker = useCallback(() => {
    if (!draftState.trim()) return;
    setSearch("");
    setPicker("district");
  }, [draftState]);

  const filteredStates = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return states;
    return states.filter((s) => s.toLowerCase().includes(q));
  }, [states, search]);

  const filteredDistricts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return districts;
    return districts.filter((s) => s.toLowerCase().includes(q));
  }, [districts, search]);

  const onPickState = useCallback(
    (name: string) => {
      onDraftStateChange(name);
      onDraftDistrictChange("");
      setPicker("none");
    },
    [onDraftStateChange, onDraftDistrictChange],
  );

  const onPickDistrict = useCallback(
    (name: string) => {
      onDraftDistrictChange(name);
      setPicker("none");
    },
    [onDraftDistrictChange],
  );

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <Pressable className="flex-1 bg-black/50" onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="bg-page"
          style={{ paddingBottom: insets.bottom }}
        >
          <View className="border-t border-border/60 px-4 pb-4 pt-5">
            <Text className="mb-4 font-display text-base text-ink">{t("mandi.filterTitle")}</Text>

            <Text className="mb-1 font-body text-sm text-ink-muted">{t("mandi.filterStateLabel")}</Text>
            <TouchableOpacity
              onPress={openStatePicker}
              className="mb-3 rounded-lg border border-border/60 bg-surface px-3 py-3"
              accessibilityRole="button"
            >
              <Text className={draftState ? "font-body text-ink" : "font-body text-ink-muted"}>
                {draftState.trim() ? draftState : t("mandi.selectState")}
              </Text>
            </TouchableOpacity>

            <Text className="mb-1 font-body text-sm text-ink-muted">{t("mandi.filterDistrictLabel")}</Text>
            <TouchableOpacity
              onPress={openDistrictPicker}
              disabled={!draftState.trim()}
              className={`mb-4 rounded-lg border border-border/60 px-3 py-3 ${
                draftState.trim() ? "bg-surface" : "bg-border/20 opacity-60"
              }`}
              accessibilityRole="button"
            >
              <Text className={draftDistrict ? "font-body text-ink" : "font-body text-ink-muted"}>
                {!draftState.trim()
                  ? t("mandi.districtRequiresState")
                  : draftDistrict.trim()
                    ? draftDistrict
                    : t("mandi.selectDistrictOptional")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onApply} className="mb-2 items-center rounded-lg bg-title-green py-3">
              <Text className="font-body-semibold text-white">{t("mandi.filterApply")}</Text>
            </TouchableOpacity>

            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={onReset}
                className="flex-1 items-center rounded-lg border border-border/60 py-3"
              >
                <Text className="font-body text-sm text-ink-muted">{t("mandi.filterReset")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onClose}
                className="flex-1 items-center rounded-lg border border-border/60 py-3"
              >
                <Text className="font-body text-sm text-ink-muted">{t("mandi.filterCancel")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={picker !== "none"} animationType="slide" onRequestClose={() => setPicker("none")}>
        <View className="flex-1 bg-page" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
          <View className="flex-row items-center justify-between border-b border-border/60 px-4 py-3">
            <TouchableOpacity onPress={() => setPicker("none")}>
              <Text className="font-body text-title-green">{t("mandi.filterCancel")}</Text>
            </TouchableOpacity>
            <Text className="font-body-semibold text-ink">
              {picker === "state" ? t("mandi.pickStateTitle") : t("mandi.pickDistrictTitle")}
            </Text>
            <View className="w-14" />
          </View>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={
              picker === "state" ? t("mandi.searchStatesPlaceholder") : t("mandi.searchDistrictsPlaceholder")
            }
            placeholderTextColor={ui.offlinePillTextHex}
            className="mx-4 mt-3 rounded-lg border border-border/60 bg-surface px-3 py-2.5 font-body text-ink"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {picker === "state" && listsBlocked === "offline" ? (
            <Text className="mx-4 mt-4 text-center font-body text-ink-muted">{t("mandi.listsOffline")}</Text>
          ) : picker === "state" && statesError ? (
            <View className="mx-4 mt-4">
              <Text className="text-center font-body text-ink-muted">{t("mandi.listsError")}</Text>
              <TouchableOpacity onPress={() => onRefetchStates?.()} className="mt-3 items-center py-2">
                <Text className="font-body-semibold text-title-green">{t("mandi.listsRetry")}</Text>
              </TouchableOpacity>
            </View>
          ) : picker === "district" && listsBlocked === "offline" ? (
            <Text className="mx-4 mt-4 text-center font-body text-ink-muted">{t("mandi.listsOffline")}</Text>
          ) : picker === "district" && districtsError ? (
            <View className="mx-4 mt-4">
              <Text className="text-center font-body text-ink-muted">{t("mandi.listsError")}</Text>
              <TouchableOpacity onPress={() => onRefetchDistricts?.()} className="mt-3 items-center py-2">
                <Text className="font-body-semibold text-title-green">{t("mandi.listsRetry")}</Text>
              </TouchableOpacity>
            </View>
          ) : picker === "state" && statesLoading ? (
            <Text className="mt-6 text-center font-body text-ink-muted">{t("mandi.listsLoading")}</Text>
          ) : picker === "district" && districtsLoading ? (
            <Text className="mt-6 text-center font-body text-ink-muted">{t("mandi.listsLoading")}</Text>
          ) : (
            <View className="mt-2 flex-1" style={{ minHeight: 280 }}>
              <FlatList
                style={{ flex: 1 }}
                data={picker === "state" ? filteredStates : filteredDistricts}
                keyExtractor={(item) => item}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 24 }}
                ListEmptyComponent={
                  <Text className="py-8 text-center font-body text-ink-muted">{t("mandi.listsEmpty")}</Text>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => (picker === "state" ? onPickState(item) : onPickDistrict(item))}
                    className="border-b border-border/40 px-3 py-3"
                  >
                    <Text className="font-body text-ink">{item}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
        </View>
      </Modal>
    </>
  );
}
