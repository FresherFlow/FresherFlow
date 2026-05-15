import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { View, BackHandler } from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView, BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { OpportunityActionSheetContent } from './OpportunityActionSheet';
import { useUIStore } from '@/store/useUIStore';
import { useTheme } from '@/contexts/ThemeContext';
import { alpha } from '@/theme';
import { RADIUS } from '../constants/dimensions';



export const GlobalActionSheet = () => {
    const { currentTheme } = useTheme();
    const { isOpen, opportunity, close } = useUIStore(s => s.actionSheet);
    const bottomSheetModalRef = useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => ['60%'], []);

    useEffect(() => {
        if (isOpen && opportunity) {
            bottomSheetModalRef.current?.present();
        } else {
            bottomSheetModalRef.current?.dismiss();
        }
    }, [isOpen, opportunity]);

    useEffect(() => {
        const handleBackPress = () => {
            if (isOpen) {
                close();
                return true;
            }
            return false;
        };

        const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
        return () => subscription.remove();
    }, [isOpen, close]);

    const handleSheetChanges = useCallback((index: number) => {
        if (index <= -1) {
            close();
        }
    }, [close]);

    const renderBackdrop = useCallback(
        (props: BottomSheetBackdropProps) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                opacity={0.4}
                pressBehavior="close"
            />
        ),
        []
    );

    return (
        <BottomSheetModal
            ref={bottomSheetModalRef}
            snapPoints={snapPoints}
            enableDynamicSizing={true}
            index={0}
            enablePanDownToClose
            backdropComponent={renderBackdrop}
            onChange={handleSheetChanges}
            key={opportunity?.id || 'empty-action-sheet'}
            backgroundStyle={{ 
                backgroundColor: currentTheme.colors.surface,
                borderTopLeftRadius: RADIUS.xl * 1.5,
                borderTopRightRadius: RADIUS.xl * 1.5,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 10,
            }}
            handleIndicatorStyle={{ 
                backgroundColor: alpha(currentTheme.colors.text, 0.15),
                width: 36,
                height: 5,
                borderRadius: 2.5,
            }}
        >
            <BottomSheetView style={{ flex: 1 }}>
                {opportunity ? (
                    <OpportunityActionSheetContent 
                        opportunity={opportunity} 
                        onClose={close}
                    />
                ) : (
                    <View style={{ height: 100 }} />
                )}
            </BottomSheetView>
        </BottomSheetModal>
    );
};
