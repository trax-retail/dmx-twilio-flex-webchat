import { useSelector } from "react-redux";
import { Box } from "@twilio-paste/core/box";
import { ChannelMetadata } from "@twilio/conversations";
import log from "loglevel";

import { AppState } from "../store/definitions";

interface DialogflowChipsContent {
    type: "chips";
    options: {
        mode: string;
        text: string;
    }[];
}

function getDialogflowChipsContent(channelMetadata: ChannelMetadata | null): DialogflowChipsContent | null {
    if (channelMetadata?.type !== "dialogflowcx") {
        return null;
    }

    const { data } = channelMetadata as { data: Record<string, unknown> };

    if (!data || !("queryResult" in data)) {
        return null;
    }

    const { queryResult } = data as { queryResult: Record<string, unknown> };

    if (!queryResult || !("responseMessages" in queryResult)) {
        return null;
    }

    const { responseMessages } = queryResult;

    if (!responseMessages || !Array.isArray(responseMessages)) {
        return null;
    }

    for (const responseMessage of responseMessages) {
        if (!Array.isArray(responseMessage.payload?.richContent)) {
            continue;
        }

        for (const richContent of responseMessage.payload.richContent) {
            if (!Array.isArray(richContent)) {
                continue;
            }

            for (const candidateContent of richContent) {
                if (candidateContent.type === "chips" && Array.isArray(candidateContent.options)) {
                    return candidateContent;
                }
            }
        }
    }

    return null;
}

export const ChannelMetaData = ({
    channelMetadata,
    isLast
}: {
    channelMetadata: ChannelMetadata | null;
    isLast: boolean;
}) => {
    const { conversation } = useSelector((state: AppState) => ({
        conversation: state.chat.conversation
    }));

    const dialogflowChipsContent = getDialogflowChipsContent(channelMetadata);

    if (dialogflowChipsContent === null) {
        return <></>;
    }

    const chipOptions = dialogflowChipsContent.options.map((x) => x.text);

    const send = async (text: string) => {
        if (!isLast) {
            // Intentionally do nothing
            return;
        }

        if (!conversation) {
            log.error("Failed sending message: no conversation found");
            return;
        }

        let preparedMessage = conversation.prepareMessage();

        preparedMessage = preparedMessage.setBody(text);

        await preparedMessage.build().send();
    };

    return (
        <>
            {chipOptions.map((option, index) => (
                <Box
                    onClick={async () => send(option)}
                    key={index}
                    as="div"
                    cursor="pointer"
                    display="inline-block"
                    backgroundColor="colorBackground"
                    paddingY="space20"
                    paddingX="space40"
                    marginTop="space20"
                    marginRight="space20"
                    borderRadius="borderRadius30"
                >
                    {option}
                </Box>
            ))}
        </>
    );
};
